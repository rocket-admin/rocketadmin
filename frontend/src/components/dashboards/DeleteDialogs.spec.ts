import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dashboard, DashboardWidget } from '@/models/dashboard';
import { buttonByText, openDialog } from './__tests__/dialog-harness';
import DashboardDeleteDialog from './DashboardDeleteDialog.vue';
import PanelDeleteDialog from './PanelDeleteDialog.vue';

const dashboards = vi.hoisted(() => ({ deleteDashboard: vi.fn(), deleteWidget: vi.fn() }));
const track = vi.hoisted(() => vi.fn());
vi.mock('@/stores/dashboards', () => ({ useDashboardsStore: () => dashboards }));
vi.mock('./analytics', () => ({ trackDashboardsEvent: track }));

const dashboard: Dashboard = {
	id: 'd1',
	name: 'Sales',
	description: null,
	connection_id: 'test-conn',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
};
const widget: DashboardWidget = {
	id: 'test-id',
	position_x: 0,
	position_y: 0,
	width: 4,
	height: 4,
	query_id: 'q1',
	dashboard_id: 'd1',
};

describe('DashboardDeleteDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('deletes the dashboard and closes with true', async () => {
		dashboards.deleteDashboard.mockResolvedValue(dashboard);
		const { wrapper, dialogRef } = await openDialog<boolean>(DashboardDeleteDialog, {
			dashboard,
			connectionId: 'test-conn',
		});

		expect(wrapper.text()).toContain('Are you sure you want to delete the dashboard Sales?');
		await wrapper.get('form').trigger('submit');

		expect(dashboards.deleteDashboard).toHaveBeenCalledWith('test-conn', 'd1');
		await expect(dialogRef.afterClosed()).resolves.toBe(true);
		expect(track).toHaveBeenCalledWith('Dashboards: dashboard deleted successfully');
		wrapper.unmount();
	});

	it('stays open when the delete fails', async () => {
		dashboards.deleteDashboard.mockRejectedValue(new Error('nope'));
		const { wrapper } = await openDialog(DashboardDeleteDialog, { dashboard, connectionId: 'test-conn' });

		await wrapper.get('form').trigger('submit');
		await flushPromises();

		expect(buttonByText(wrapper, 'Delete dashboard').attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});
});

describe('PanelDeleteDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('deletes the widget and closes with true', async () => {
		dashboards.deleteWidget.mockResolvedValue(widget);
		const { wrapper, dialogRef } = await openDialog<boolean>(PanelDeleteDialog, {
			connectionId: 'test-conn',
			dashboardId: 'test-dash',
			widget,
		});

		expect(wrapper.get('h2').text()).toBe('Delete panel');
		await wrapper.get('form').trigger('submit');

		expect(dashboards.deleteWidget).toHaveBeenCalledWith('test-conn', 'test-dash', 'test-id');
		await expect(dialogRef.afterClosed()).resolves.toBe(true);
		expect(track).toHaveBeenCalledWith('Dashboards: panel deleted successfully');
		wrapper.unmount();
	});

	it('shows the busy label while deleting', async () => {
		dashboards.deleteWidget.mockReturnValue(new Promise(() => {}));
		const { wrapper } = await openDialog(PanelDeleteDialog, { connectionId: 'c', dashboardId: 'd', widget });

		await wrapper.get('form').trigger('submit');

		expect(wrapper.get('button[type="submit"]').text()).toBe('Deleting...');
		wrapper.unmount();
	});
});
