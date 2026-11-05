import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DbConnectionDeleteDialog from './DbConnectionDeleteDialog.vue';
import { buttonByText, openDialog } from './dialogTestUtils';

const connections = vi.hoisted(() => ({ deleteConnection: vi.fn() }));
const trackConnectionEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => connections }));
vi.mock('./analytics', () => ({ trackConnectionEvent }));

const connection = { id: '12345678', title: 'Production', database: 'prod_db' };

describe('DbConnectionDeleteDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('names the connection by its title, or its database', async () => {
		const titled = await openDialog(DbConnectionDeleteDialog, connection);
		expect(titled.wrapper.find('h2').text()).toBe('Delete Production connection');
		titled.wrapper.unmount();

		const untitled = await openDialog(DbConnectionDeleteDialog, { ...connection, title: '' });
		expect(untitled.wrapper.find('h2').text()).toBe('Delete prod_db connection');
		untitled.wrapper.unmount();
	});

	it('deletes the connection with the reason and message, then goes to the connections list', async () => {
		connections.deleteConnection.mockResolvedValue(undefined);
		const { wrapper, router, dialogRef } = await openDialog(DbConnectionDeleteDialog, connection);

		const radios = wrapper.findAll('input[type="radio"]');
		await radios[1]?.setValue(true);
		await wrapper.find('textarea').setValue('Too slow');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(connections.deleteConnection).toHaveBeenCalledWith('12345678', {
			reason: 'technical-issues',
			message: 'Too slow',
		});
		expect(trackConnectionEvent).toHaveBeenCalledWith('Connect DB: connection is deleted', {
			id: '12345678',
			title: 'Production',
			reason: 'technical-issues',
			message: 'Too slow',
		});
		expect(router.currentRoute.value.path).toBe('/connections-list');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		wrapper.unmount();
	});

	it('stays open when the delete fails', async () => {
		connections.deleteConnection.mockRejectedValue(new Error('nope'));
		const { wrapper, router } = await openDialog(DbConnectionDeleteDialog, connection);

		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(router.currentRoute.value.path).toBe('/edit-db/1');
		expect(wrapper.find('form').exists()).toBe(true);
		wrapper.unmount();
	});

	it('closes on Abort without deleting', async () => {
		const { wrapper, dialogRef } = await openDialog(DbConnectionDeleteDialog, connection);

		await buttonByText(wrapper, 'Abort').trigger('click');

		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		expect(connections.deleteConnection).not.toHaveBeenCalled();
		wrapper.unmount();
	});
});
