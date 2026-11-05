import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartStub } from '@/components/charts/__tests__/chart-stub';
import { byText, mountPage } from '@/components/dashboards/__tests__/mount-page';
import type { SavedQuery } from '@/models/saved-query';
import ChartEditView from './ChartEditView.vue';

vi.mock('vue-chartjs', async () => ({ Chart: (await import('@/components/charts/__tests__/chart-stub')).ChartStub }));

const savedQueries = vi.hoisted(() => ({
	fetchSavedQuery: vi.fn(),
	createSavedQuery: vi.fn(),
	updateSavedQuery: vi.fn(),
	testQuery: vi.fn(),
}));
const dashboards = vi.hoisted(() => ({ generateWidgetWithAi: vi.fn() }));
const track = vi.hoisted(() => vi.fn());
vi.mock('@/stores/saved-queries', () => ({ useSavedQueriesStore: () => savedQueries }));
vi.mock('@/stores/dashboards', () => ({ useDashboardsStore: () => dashboards }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => ({ connectionTitle: 'Test Connection' }) }));
vi.mock('@/stores/ui-settings', () => ({
	useUiSettingsStore: () => ({
		isDarkMode: false,
		getUiSettings: vi.fn(async () => null),
		updateConnectionSetting: vi.fn(),
	}),
}));
vi.mock('@/components/dashboards/analytics', () => ({ trackDashboardsEvent: track }));

const PATTERNS = ['/panels/:connectionId/new', '/panels/:connectionId/:queryId'];

const savedQuery: SavedQuery = {
	id: '1',
	name: 'Test Query',
	description: 'Test description',
	widget_type: 'chart',
	chart_type: 'line',
	widget_options: { label_column: 'name', value_column: 'count', stacked: true, y_axis: { title: 'Total' } },
	query_text: 'SELECT * FROM users',
	connection_id: 'conn-1',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
};

const testResult = { data: [{ name: 'John', count: 10 }], execution_time_ms: 50 };

function saveButton(wrapper: VueWrapper) {
	return wrapper.get('[data-testid="save-query-button"]');
}

async function typeQuery(wrapper: VueWrapper, name: string, sql: string) {
	await wrapper.get('[data-testid="query-name-input"]').setValue(name);
	await wrapper.get('textarea[aria-label="SQL query"]').setValue(sql);
}

describe('ChartEditView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		savedQueries.testQuery.mockResolvedValue(testResult);
		savedQueries.createSavedQuery.mockResolvedValue(savedQuery);
		savedQueries.updateSavedQuery.mockResolvedValue(savedQuery);
		savedQueries.fetchSavedQuery.mockResolvedValue(savedQuery);
	});

	describe('create mode', () => {
		const open = () => mountPage(ChartEditView, PATTERNS, '/panels/conn-1/new');

		it('starts in create mode with the AI section open', async () => {
			const { wrapper } = await open();

			expect(wrapper.get('h1').text()).toBe('Create panel');
			expect(document.title).toBe('Create Query | Test Connection');
			expect(savedQueries.fetchSavedQuery).not.toHaveBeenCalled();
			expect(wrapper.get('[data-testid="ai-section"] button').attributes('aria-expanded')).toBe('true');
			expect(wrapper.get('[data-testid="manual-section"] button').attributes('aria-expanded')).toBe('false');
			expect(saveButton(wrapper).text()).toBe('Save query');
			wrapper.unmount();
		});

		it('needs a name and a query to save, and a query to test', async () => {
			const { wrapper } = await open();
			const test = wrapper.get('[data-testid="test-query-button"]');

			expect(saveButton(wrapper).attributes('disabled')).toBeDefined();
			expect(test.attributes('disabled')).toBeDefined();
			await wrapper.get('textarea[aria-label="SQL query"]').setValue('SELECT 1');
			expect(test.attributes('disabled')).toBeUndefined();
			expect(saveButton(wrapper).attributes('disabled')).toBeDefined();
			await wrapper.get('[data-testid="query-name-input"]').setValue('   ');
			expect(saveButton(wrapper).attributes('disabled')).toBeDefined();
			await wrapper.get('[data-testid="query-name-input"]').setValue('Test');
			expect(saveButton(wrapper).attributes('disabled')).toBeUndefined();
			wrapper.unmount();
		});

		it('tests the query, shows the results and auto-selects the label column and first series', async () => {
			const { wrapper } = await open();
			await typeQuery(wrapper, 'Q', 'SELECT * FROM users');

			await wrapper.get('[data-testid="test-query-button"]').trigger('click');
			await flushPromises();

			expect(savedQueries.testQuery).toHaveBeenCalledWith('conn-1', { query_text: 'SELECT * FROM users' });
			expect(track).toHaveBeenCalledWith('Charts: test query executed');
			expect(wrapper.text()).toContain('Executed in 50ms');
			expect(wrapper.text()).toContain('Query results (1 rows)');
			const labelSelect = wrapper.get<HTMLSelectElement>('[data-testid="label-column-select"]');
			expect(labelSelect.element.selectedOptions[0]?.textContent?.trim()).toBe('name');
			expect(wrapper.find('[data-testid="series-card-0"]').exists()).toBe(true);
			expect(wrapper.getComponent(ChartStub).props('data')).toMatchObject({
				labels: ['John'],
				datasets: [{ data: [10] }],
			});
			wrapper.unmount();
		});

		it('says so when the query returns no rows', async () => {
			savedQueries.testQuery.mockResolvedValue({ data: [], execution_time_ms: 3 });
			const { wrapper } = await open();
			await typeQuery(wrapper, 'Q', 'SELECT 1 WHERE false');

			await wrapper.get('[data-testid="test-query-button"]').trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain('Query executed successfully but returned no results.');
			expect(wrapper.findComponent(ChartStub).exists()).toBe(false);
			wrapper.unmount();
		});

		it('asks for a series once every series is removed', async () => {
			savedQueries.testQuery.mockResolvedValue({ data: [{ name: 'A', count: 1, total: 2 }], execution_time_ms: 1 });
			const { wrapper } = await open();
			await typeQuery(wrapper, 'Q', 'SELECT 1');
			await wrapper.get('[data-testid="test-query-button"]').trigger('click');
			await flushPromises();

			await wrapper.get('[data-testid="add-series-button"]').trigger('click');
			expect(wrapper.findAll('[data-testid^="series-card-"]')).toHaveLength(2);
			await wrapper.get('[data-testid="series-card-1"] button[aria-label="Remove series"]').trigger('click');
			expect(wrapper.findAll('[data-testid^="series-card-"]')).toHaveLength(1);
			wrapper.unmount();
		});

		it('creates the saved query with the default chart options and goes back to the panels list', async () => {
			const { wrapper, router } = await open();
			await typeQuery(wrapper, 'New Query', 'SELECT 1');

			await saveButton(wrapper).trigger('click');
			await flushPromises();

			expect(savedQueries.createSavedQuery).toHaveBeenCalledWith('conn-1', {
				name: 'New Query',
				description: undefined,
				query_text: 'SELECT 1',
				widget_type: 'chart',
				chart_type: 'bar',
				widget_options: { label_column: '', label_type: 'values' },
			});
			expect(track).toHaveBeenCalledWith('Charts: saved query created');
			expect(router.currentRoute.value.path).toBe('/panels/conn-1');
			wrapper.unmount();
		});

		it('saves the display, series and palette options set in the editor', async () => {
			const { wrapper } = await open();
			await typeQuery(wrapper, 'Q', 'SELECT 1');
			await wrapper.get('[data-testid="test-query-button"]').trigger('click');
			await flushPromises();

			const checkbox = (label: string) => {
				const match = wrapper.findAll('label.ui-checkbox').find((candidate) => candidate.text() === label);
				if (!match) throw new Error(`No checkbox "${label}"`);
				return match.get('input');
			};
			await checkbox('Stacked').setValue(true);
			await checkbox('Show legend').setValue(false);
			await byText(wrapper, 'Load defaults').trigger('click');
			await wrapper.findAll('button[aria-label="Remove color"]')[0]?.trigger('click');
			await wrapper.get('[data-testid="series-card-0"] input[placeholder="Auto"]').setValue('Users');
			await saveButton(wrapper).trigger('click');
			await flushPromises();

			const options = savedQueries.createSavedQuery.mock.calls[0]?.[1].widget_options;
			expect(options).toMatchObject({
				label_column: 'name',
				series: [{ value_column: 'count', label: 'Users' }],
				stacked: true,
				legend: { show: false, position: 'top' },
			});
			expect(options.color_palette).toHaveLength(9);
			wrapper.unmount();
		});

		it('stays on the page when saving fails', async () => {
			savedQueries.createSavedQuery.mockRejectedValue(new Error('nope'));
			const { wrapper, router } = await open();
			await typeQuery(wrapper, 'New Query', 'SELECT 1');

			await saveButton(wrapper).trigger('click');
			await flushPromises();

			expect(router.currentRoute.value.path).toBe('/panels/conn-1/new');
			expect(saveButton(wrapper).attributes('disabled')).toBeUndefined();
			wrapper.unmount();
		});

		it('generates the panel with AI, applies it and tests the generated query', async () => {
			dashboards.generateWidgetWithAi.mockResolvedValue({
				name: 'Revenue',
				description: 'Monthly revenue',
				widget_type: 'chart',
				chart_type: 'pie',
				widget_options: { label_column: 'name', value_column: 'count' },
				query_text: 'SELECT name, count FROM sales',
				connection_id: 'conn-1',
				panel_position: { position_x: 0, position_y: 0, width: 4, height: 4 },
			});
			const { wrapper } = await open();
			const generate = wrapper.get('[data-testid="ai-generate-button"]');

			expect(generate.attributes('disabled')).toBeDefined();
			await wrapper.get('[data-testid="ai-description-input"]').setValue('Revenue by product');
			await generate.trigger('click');
			await flushPromises();

			expect(dashboards.generateWidgetWithAi).toHaveBeenCalledWith('conn-1', {
				chart_description: 'Revenue by product',
			});
			expect(savedQueries.testQuery).toHaveBeenCalledWith('conn-1', { query_text: 'SELECT name, count FROM sales' });
			expect(track).toHaveBeenCalledWith('Charts: AI generation used');
			expect(wrapper.get<HTMLInputElement>('[data-testid="query-name-input"]').element.value).toBe('Revenue');
			expect(wrapper.get('[data-testid="ai-section"] button').attributes('aria-expanded')).toBe('false');
			expect(wrapper.get('[data-testid="manual-section"] button').attributes('aria-expanded')).toBe('true');
			expect(wrapper.getComponent(ChartStub).props('type')).toBe('pie');
			wrapper.unmount();
		});
	});

	describe('edit mode', () => {
		const open = () => mountPage(ChartEditView, PATTERNS, '/panels/conn-1/1');

		it('loads the saved query, applies its options and tests it', async () => {
			const { wrapper } = await open();

			expect(savedQueries.fetchSavedQuery).toHaveBeenCalledWith('conn-1', '1');
			expect(savedQueries.testQuery).toHaveBeenCalledWith('conn-1', { query_text: 'SELECT * FROM users' });
			expect(wrapper.get('h1').text()).toBe('Edit panel');
			expect(document.title).toBe('Edit Query | Test Connection');
			expect(wrapper.get<HTMLInputElement>('[data-testid="query-name-input"]').element.value).toBe('Test Query');
			expect(wrapper.get('[data-testid="manual-section"] button').attributes('aria-expanded')).toBe('true');
			expect(saveButton(wrapper).text()).toBe('Update query');
			wrapper.unmount();
		});

		it('updates the saved query, keeping its stored options', async () => {
			const { wrapper, router } = await open();

			await saveButton(wrapper).trigger('click');
			await flushPromises();

			expect(savedQueries.updateSavedQuery).toHaveBeenCalledWith('conn-1', '1', {
				name: 'Test Query',
				description: 'Test description',
				query_text: 'SELECT * FROM users',
				widget_type: 'chart',
				chart_type: 'line',
				widget_options: {
					label_column: 'name',
					label_type: 'values',
					series: [{ value_column: 'count' }],
					stacked: true,
					y_axis: { title: 'Total' },
				},
			});
			expect(track).toHaveBeenCalledWith('Charts: saved query updated');
			expect(router.currentRoute.value.path).toBe('/panels/conn-1');
			wrapper.unmount();
		});

		it('links back to the panels list', async () => {
			const { wrapper } = await open();

			expect(byText(wrapper, 'Back', 'a').attributes('href')).toBe('/panels/conn-1');
			wrapper.unmount();
		});
	});
});
