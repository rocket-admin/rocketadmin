import type { Meta, StoryObj } from '@storybook/angular';
import { CounterPanelComponent } from './counter-panel.component';

const mockWidget = {
	id: 'widget-1',
	position_x: 0,
	position_y: 0,
	width: 4,
	height: 2,
	query_id: 'query-1',
	dashboard_id: 'dashboard-1',
};

const mockQuery = {
	id: 'query-1',
	name: 'Total Users',
	description: null,
	widget_type: 'counter' as const,
	chart_type: null,
	widget_options: null,
	query_text: 'SELECT COUNT(*) as total FROM users',
	connection_id: 'conn-1',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
};

const meta: Meta<CounterPanelComponent> = {
	title: 'Dashboard Panels/Counter',
	component: CounterPanelComponent,
	args: {
		widget: mockWidget as any,
		connectionId: 'conn-1',
		preloadedQuery: mockQuery as any,
		preloadedData: [{ total: 1234 }],
	},
};

export default meta;
type Story = StoryObj<CounterPanelComponent>;

export const Default: Story = {};

export const LargeNumber: Story = {
	args: {
		preloadedData: [{ total: 1500000 }],
	},
};

export const NoData: Story = {
	args: {
		preloadedQuery: null,
		preloadedData: [],
	},
};
