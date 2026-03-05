import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { DashboardPanelComponent } from './dashboard-panel.component';

const mockWidget = {
	id: 'widget-5',
	position_x: 0,
	position_y: 0,
	width: 6,
	height: 4,
	query_id: 'query-5',
	dashboard_id: 'dashboard-1',
};

const mockSavedQueriesService: Partial<SavedQueriesService> = {
	fetchSavedQuery: () =>
		Promise.resolve({
			id: 'query-5',
			name: 'Total Users',
			description: null,
			widget_type: 'counter' as const,
			chart_type: null,
			widget_options: null,
			query_text: 'SELECT COUNT(*) as total FROM users',
			connection_id: 'conn-1',
			created_at: '2024-01-01',
			updated_at: '2024-01-01',
		}),
	executeSavedQuery: () =>
		Promise.resolve({
			query_id: 'query-5',
			query_name: 'Total Users',
			data: [{ total: 1234 }],
			execution_time_ms: 42,
		}),
};

const meta: Meta<DashboardPanelComponent> = {
	title: 'Dashboard Panels/DashboardPanel',
	component: DashboardPanelComponent,
	args: {
		widget: mockWidget as any,
		connectionId: 'conn-1',
	},
	decorators: [
		applicationConfig({
			providers: [{ provide: SavedQueriesService, useValue: mockSavedQueriesService }],
		}),
	],
};

export default meta;
type Story = StoryObj<DashboardPanelComponent>;

export const Default: Story = {};

export const NoQuery: Story = {
	args: {
		widget: {
			...mockWidget,
			query_id: null,
		} as any,
	},
};
