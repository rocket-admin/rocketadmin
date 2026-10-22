import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedQuery } from '@/models/saved-query';
import { buttonByText, openDialog } from '../dashboards/__tests__/dialog-harness';
import ChartDeleteDialog from './ChartDeleteDialog.vue';

const savedQueries = vi.hoisted(() => ({ deleteSavedQuery: vi.fn() }));
vi.mock('@/stores/saved-queries', () => ({ useSavedQueriesStore: () => savedQueries }));
vi.mock('../dashboards/analytics', () => ({ trackDashboardsEvent: vi.fn() }));

const query: SavedQuery = {
	id: '1',
	name: 'Test Query',
	description: 'Test description',
	widget_type: 'chart',
	chart_type: 'bar',
	widget_options: null,
	query_text: 'SELECT * FROM users',
	connection_id: 'conn-1',
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
};

const open = () => openDialog<boolean>(ChartDeleteDialog, { query, connectionId: 'conn-1' });

describe('ChartDeleteDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('names the query being deleted', async () => {
		const { wrapper } = await open();

		expect(wrapper.find('h2').text()).toBe('Delete saved query');
		expect(wrapper.text()).toContain('Are you sure you want to delete the query Test Query?');
		wrapper.unmount();
	});

	it('deletes the query and closes with true', async () => {
		savedQueries.deleteSavedQuery.mockResolvedValue(query);
		const { wrapper, dialogRef } = await open();

		expect(buttonByText(wrapper, 'Delete query').attributes('type')).toBe('submit');
		await wrapper.find('form').trigger('submit');

		expect(savedQueries.deleteSavedQuery).toHaveBeenCalledWith('conn-1', '1');
		await expect(dialogRef.afterClosed()).resolves.toBe(true);
		wrapper.unmount();
	});

	it('shows the busy label while deleting', async () => {
		savedQueries.deleteSavedQuery.mockReturnValue(new Promise(() => {}));
		const { wrapper } = await open();

		await wrapper.find('form').trigger('submit');

		expect(wrapper.find('button[type="submit"]').text()).toBe('Deleting...');
		wrapper.unmount();
	});

	it('stays open and re-enables the button when the delete fails', async () => {
		savedQueries.deleteSavedQuery.mockRejectedValue(new Error('nope'));
		const { wrapper, dialogRef } = await open();
		const closed = vi.fn();
		dialogRef.afterClosed().then(closed);

		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(closed).not.toHaveBeenCalled();
		const submit = wrapper.find('button[type="submit"]');
		expect(submit.text()).toBe('Delete query');
		expect(submit.attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});
});
