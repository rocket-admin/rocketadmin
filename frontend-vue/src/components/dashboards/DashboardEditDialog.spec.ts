import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dashboard } from '@/models/dashboard';
import { buttonByText, openDialog } from './__tests__/dialog-harness';
import DashboardEditDialog from './DashboardEditDialog.vue';

const dashboards = vi.hoisted(() => ({ createDashboard: vi.fn(), updateDashboard: vi.fn() }));
const track = vi.hoisted(() => vi.fn());
vi.mock('@/stores/dashboards', () => ({ useDashboardsStore: () => dashboards }));
vi.mock('./analytics', () => ({ trackDashboardsEvent: track }));

const dashboard: Dashboard = {
	id: 'd1',
	name: 'Sales',
	description: 'Monthly numbers',
	connection_id: 'test-conn',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
};

describe('DashboardEditDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('creates a dashboard and closes with true', async () => {
		dashboards.createDashboard.mockResolvedValue(dashboard);
		const { wrapper, dialogRef } = await openDialog<boolean>(DashboardEditDialog, {
			connectionId: 'test-conn',
			dashboard: null,
		});

		expect(wrapper.get('h2').text()).toBe('Create dashboard');
		expect(buttonByText(wrapper, 'Create').attributes('disabled')).toBeDefined();
		await wrapper.get('[data-testid="dashboard-name-input"]').setValue('Sales');
		await wrapper.get('[data-testid="dashboard-description-input"]').setValue('Numbers');
		await wrapper.get('form').trigger('submit');

		expect(dashboards.createDashboard).toHaveBeenCalledWith('test-conn', { name: 'Sales', description: 'Numbers' });
		await expect(dialogRef.afterClosed()).resolves.toBe(true);
		expect(track).toHaveBeenCalledWith('Dashboards: dashboard created successfully');
		wrapper.unmount();
	});

	it('edits an existing dashboard', async () => {
		dashboards.updateDashboard.mockResolvedValue(dashboard);
		const { wrapper, dialogRef } = await openDialog<boolean>(DashboardEditDialog, {
			connectionId: 'test-conn',
			dashboard,
		});

		expect(wrapper.get('h2').text()).toBe('Edit dashboard');
		expect(wrapper.get<HTMLInputElement>('[data-testid="dashboard-name-input"]').element.value).toBe('Sales');
		await wrapper.get('[data-testid="dashboard-name-input"]').setValue('Revenue');
		await buttonByText(wrapper, 'Update').trigger('click');

		expect(dashboards.updateDashboard).toHaveBeenCalledWith('test-conn', 'd1', {
			name: 'Revenue',
			description: 'Monthly numbers',
		});
		await expect(dialogRef.afterClosed()).resolves.toBe(true);
		wrapper.unmount();
	});

	it('validates the name and description', async () => {
		const { wrapper } = await openDialog(DashboardEditDialog, { connectionId: 'test-conn', dashboard: null });
		const name = wrapper.get('[data-testid="dashboard-name-input"]');

		await name.trigger('blur');
		expect(wrapper.text()).toContain('Name is required');
		await name.setValue('x'.repeat(256));
		expect(wrapper.text()).toContain('Name must be less than 255 characters');
		await name.setValue('ok');
		await wrapper.get('[data-testid="dashboard-description-input"]').setValue('y'.repeat(1001));
		expect(wrapper.text()).toContain('Description must be less than 1000 characters');
		expect(buttonByText(wrapper, 'Create').attributes('disabled')).toBeDefined();
		await wrapper.get('form').trigger('submit');
		expect(dashboards.createDashboard).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it('stays open when saving fails', async () => {
		dashboards.createDashboard.mockRejectedValue(new Error('nope'));
		const { wrapper } = await openDialog(DashboardEditDialog, { connectionId: 'test-conn', dashboard: null });

		await wrapper.get('[data-testid="dashboard-name-input"]').setValue('Sales');
		await wrapper.get('form').trigger('submit');
		await flushPromises();

		expect(wrapper.find('form').exists()).toBe(true);
		expect(buttonByText(wrapper, 'Create').attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});
});
