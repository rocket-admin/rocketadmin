import type { Meta, StoryObj } from '@storybook/angular';
import { TablePanelComponent } from './table-panel.component';

const mockWidget = {
	id: 'widget-3',
	position_x: 0,
	position_y: 0,
	width: 8,
	height: 4,
	query_id: 'query-3',
	dashboard_id: 'dashboard-1',
};

const mockQuery = {
	id: 'query-3',
	name: 'Recent Orders',
	description: null,
	widget_type: 'table' as const,
	chart_type: null,
	widget_options: null,
	query_text: 'SELECT id, customer, amount, status FROM orders LIMIT 10',
	connection_id: 'conn-1',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
};

const mockData = [
	{ id: 1, customer: 'Alice', amount: 250.0, status: 'completed' },
	{ id: 2, customer: 'Bob', amount: 120.5, status: 'pending' },
	{ id: 3, customer: 'Charlie', amount: 340.0, status: 'completed' },
	{ id: 4, customer: 'Diana', amount: 89.99, status: 'cancelled' },
	{ id: 5, customer: 'Eve', amount: 560.0, status: 'completed' },
];

const meta: Meta<TablePanelComponent> = {
	title: 'Dashboard Panels/Table',
	component: TablePanelComponent,
	args: {
		widget: mockWidget as any,
		connectionId: 'conn-1',
		preloadedQuery: mockQuery as any,
		preloadedData: mockData,
	},
};

export default meta;
type Story = StoryObj<TablePanelComponent>;

export const Default: Story = {};

export const NoData: Story = {
	args: {
		preloadedQuery: null,
		preloadedData: [],
	},
};
