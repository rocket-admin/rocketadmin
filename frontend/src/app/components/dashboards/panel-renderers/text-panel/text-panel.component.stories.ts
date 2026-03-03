import type { Meta, StoryObj } from '@storybook/angular';
import { TextPanelComponent } from './text-panel.component';

const mockWidget = {
	id: 'widget-4',
	position_x: 0,
	position_y: 0,
	width: 4,
	height: 2,
	query_id: 'query-4',
	dashboard_id: 'dashboard-1',
};

const mockQuery = {
	id: 'query-4',
	name: 'Dashboard Info',
	description: null,
	widget_type: 'text' as const,
	chart_type: null,
	widget_options: {
		text_content:
			'## Welcome\n\nThis dashboard shows key metrics for the **Q1 2024** report.\n\n- Total revenue\n- Active users\n- Order status',
	},
	query_text: '',
	connection_id: 'conn-1',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
};

const meta: Meta<TextPanelComponent> = {
	title: 'Dashboard Panels/Text',
	component: TextPanelComponent,
	args: {
		widget: mockWidget as any,
		preloadedQuery: mockQuery as any,
	},
};

export default meta;
type Story = StoryObj<TextPanelComponent>;

export const Default: Story = {};

export const NoContent: Story = {
	args: {
		preloadedQuery: null,
	},
};
