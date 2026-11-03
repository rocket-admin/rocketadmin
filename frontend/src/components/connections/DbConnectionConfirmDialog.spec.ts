import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Connection, ConnectionType, DBtype } from '@/models/connection';
import DbConnectionConfirmDialog from './DbConnectionConfirmDialog.vue';
import type { DbConnectionConfirmDialogData } from './dialogs';
import { buttonByText, openDialog } from './dialogTestUtils';

const connections = vi.hoisted(() => ({ createConnection: vi.fn(), updateConnection: vi.fn() }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => connections }));

const dbCreds = {
	id: null,
	title: 'Production',
	type: DBtype.MySQL,
	host: 'db.us-east-2.rds.amazonaws.com',
	connectionType: ConnectionType.Direct,
} as Partial<Connection> as Connection;

function data(overrides: Partial<DbConnectionConfirmDialogData> = {}): DbConnectionConfirmDialogData {
	return { dbCreds, provider: 'amazon', masterKey: 'key', errorMessage: 'Hostname is invalid', ...overrides };
}

describe('DbConnectionConfirmDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('shows the error and the provider docs link', async () => {
		const { wrapper } = await openDialog(DbConnectionConfirmDialog, data());

		expect(wrapper.text()).toContain('Connection does not exist or credentials are incorrect.');
		expect(wrapper.text()).toContain('Error: Hostname is invalid');
		expect(wrapper.text()).toContain('Need help with Amazon Web Services integration?');
		expect(buttonByText(wrapper, 'Open docs').attributes('href')).toContain('create_aws_mysql');
		wrapper.unmount();
	});

	it('hides the docs hint without a provider', async () => {
		const { wrapper } = await openDialog(DbConnectionConfirmDialog, data({ provider: null }));

		expect(wrapper.text()).not.toContain('Need help with');
		wrapper.unmount();
	});

	it('adds a new connection anyway and opens its dashboard', async () => {
		connections.createConnection.mockResolvedValue({ id: 'new-id' });
		const { wrapper, router, dialogRef } = await openDialog(DbConnectionConfirmDialog, data());

		await buttonByText(wrapper, 'Add anyway').trigger('click');
		await flushPromises();

		expect(connections.createConnection).toHaveBeenCalledWith(dbCreds, 'key');
		expect(router.currentRoute.value.path).toBe('/dashboard/new-id');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		wrapper.unmount();
	});

	it('saves an existing connection anyway and opens its dashboard', async () => {
		connections.updateConnection.mockResolvedValue({ connection: { id: 'conn-1' } });
		const saved = { ...dbCreds, id: 'conn-1' };
		const { wrapper, router } = await openDialog(DbConnectionConfirmDialog, data({ dbCreds: saved }));

		await buttonByText(wrapper, 'Save anyway').trigger('click');
		await flushPromises();

		expect(connections.updateConnection).toHaveBeenCalledWith(saved, 'key');
		expect(router.currentRoute.value.path).toBe('/dashboard/conn-1');
		wrapper.unmount();
	});

	it('closes with "change" on Keep editing', async () => {
		const { wrapper, dialogRef } = await openDialog(DbConnectionConfirmDialog, data());

		await buttonByText(wrapper, 'Keep editing').trigger('click');

		await expect(dialogRef.afterClosed()).resolves.toBe('change');
		expect(connections.createConnection).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it('links to the issue tracker in the self-hosted build', async () => {
		const { wrapper } = await openDialog(DbConnectionConfirmDialog, data());

		expect(buttonByText(wrapper, 'Report a bug').attributes('href')).toBe(
			'https://github.com/rocket-admin/rocketadmin/issues',
		);
		wrapper.unmount();
	});
});
