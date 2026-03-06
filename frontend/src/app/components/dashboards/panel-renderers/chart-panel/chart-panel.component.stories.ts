import type { Meta, StoryObj } from '@storybook/angular';
import { ChartPanelComponent } from './chart-panel.component';

const mockWidget = {
	id: 'widget-2',
	position_x: 0,
	position_y: 0,
	width: 6,
	height: 4,
	query_id: 'query-2',
	dashboard_id: 'dashboard-1',
};

const mockQuery = {
	id: 'query-2',
	name: 'Monthly Revenue',
	description: null,
	widget_type: 'chart' as const,
	chart_type: 'bar' as const,
	widget_options: {
		label_column: 'month',
		value_column: 'revenue',
	},
	query_text: 'SELECT month, revenue FROM monthly_stats',
	connection_id: 'conn-1',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
};

const mockData = [
	{ month: 'Jan', revenue: 12000 },
	{ month: 'Feb', revenue: 15000 },
	{ month: 'Mar', revenue: 18000 },
	{ month: 'Apr', revenue: 14000 },
	{ month: 'May', revenue: 21000 },
	{ month: 'Jun', revenue: 19000 },
];

const meta: Meta<ChartPanelComponent> = {
	title: 'Dashboard Panels/Chart',
	component: ChartPanelComponent,
	args: {
		widget: mockWidget as any,
		connectionId: 'conn-1',
		preloadedQuery: mockQuery as any,
		preloadedData: mockData,
	},
};

export default meta;
type Story = StoryObj<ChartPanelComponent>;

export const Default: Story = {};

export const LineChart: Story = {
	args: {
		preloadedQuery: {
			...mockQuery,
			chart_type: 'line',
		} as any,
	},
};

export const PieChart: Story = {
	args: {
		preloadedQuery: {
			...mockQuery,
			chart_type: 'pie',
		} as any,
	},
};

export const NoData: Story = {
	args: {
		preloadedQuery: null,
		preloadedData: [],
	},
};
