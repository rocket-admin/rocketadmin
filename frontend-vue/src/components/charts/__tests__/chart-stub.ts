// Spec helper: Chart.js canvases don't render in jsdom, so specs replace vue-chartjs's <Chart> with
// this stub and assert on the props it received.
//
//   vi.mock('vue-chartjs', async () => ({ Chart: (await import('@/components/charts/__tests__/chart-stub')).ChartStub }));
import { defineComponent, h, type PropType } from 'vue';

export const ChartStub = defineComponent({
	name: 'ChartStub',
	props: {
		type: { type: String, required: true },
		data: { type: Object, required: true },
		options: { type: Object, default: () => ({}) },
		plugins: { type: Array as PropType<unknown[]>, default: () => [] },
	},
	setup(props) {
		return () => h('div', { 'data-testid': 'chart', 'data-type': props.type });
	},
});
