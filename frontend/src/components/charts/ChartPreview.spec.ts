import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { ChartWidgetOptions } from '@/models/saved-query';
import { ChartStub } from './__tests__/chart-stub';
import ChartPreview from './ChartPreview.vue';

vi.mock('vue-chartjs', async () => ({ Chart: (await import('./__tests__/chart-stub')).ChartStub }));

const rows = [
	{ name: 'A', count: 10 },
	{ name: 'B', count: 20 },
];

describe('ChartPreview', () => {
	it('draws the rows with the widget options', () => {
		const wrapper = mount(ChartPreview, {
			props: {
				chartType: 'line',
				data: rows,
				widgetOptions: { label_column: 'name', series: [{ value_column: 'count' }] },
			},
		});
		const chart = wrapper.getComponent(ChartStub);

		expect(chart.props('type')).toBe('line');
		expect(chart.props('data')).toMatchObject({ labels: ['A', 'B'], datasets: [{ data: [10, 20] }] });
		expect(chart.props('plugins')).toHaveLength(1);
	});

	it('falls back to the legacy label/value column props', () => {
		const wrapper = mount(ChartPreview, { props: { data: rows, labelColumn: 'name', valueColumn: 'count' } });

		expect(wrapper.getComponent(ChartStub).props('data')).toMatchObject({ labels: ['A', 'B'] });
	});

	it('uses a bar base type for mixed series', () => {
		const wrapper = mount(ChartPreview, {
			props: {
				chartType: 'line',
				data: rows,
				widgetOptions: { label_column: 'name', series: [{ value_column: 'count', type: 'bar' }] },
			},
		});

		expect(wrapper.getComponent(ChartStub).props('type')).toBe('bar');
	});

	it('shows the empty state without rows, a label column or a value source', () => {
		const cases: { data: Record<string, unknown>[]; widgetOptions: ChartWidgetOptions }[] = [
			{ data: [], widgetOptions: { label_column: 'name', value_column: 'count' } },
			{ data: rows, widgetOptions: { label_column: '', value_column: 'count' } },
			{ data: rows, widgetOptions: { label_column: 'name' } },
		];
		for (const props of cases) {
			const wrapper = mount(ChartPreview, { props });
			expect(wrapper.findComponent(ChartStub).exists()).toBe(false);
			expect(wrapper.text()).toContain('No chart data available');
		}
	});
});
