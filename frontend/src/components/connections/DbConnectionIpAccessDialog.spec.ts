import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Connection, DBtype } from '@/models/connection';
import { useNotificationsStore } from '@/stores/notifications';
import DbConnectionIpAccessDialog from './DbConnectionIpAccessDialog.vue';
import type { DbConnectionIpAccessDialogData } from './dialogs';
import { buttonByText, openDialog } from './dialogTestUtils';

const copyToClipboard = vi.hoisted(() => vi.fn());
vi.mock('@/lib/clipboard', () => ({ copyToClipboard }));

function data(type: DBtype, provider: DbConnectionIpAccessDialogData['provider']): DbConnectionIpAccessDialogData {
	const db = { type, host: 'db.example.com', database: 'shop', username: 'admin', schema: '' } as Partial<Connection>;
	return { db: db as Connection, provider };
}

describe('DbConnectionIpAccessDialog', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('shows the AWS steps and a setup guide link for an Amazon host', async () => {
		const { wrapper } = await openDialog(DbConnectionIpAccessDialog, data(DBtype.MySQL, 'amazon'));

		expect(wrapper.text()).toContain("Set up AWS's VPC security groups");
		expect(buttonByText(wrapper, 'Setup guide').attributes('href')).toContain('create_aws_mysql');
		expect(wrapper.findAll('button').some((button) => button.text() === 'Cancel')).toBe(false);
		wrapper.unmount();
	});

	it('shows the PostgreSQL grants for a self-hosted database and copies them', async () => {
		copyToClipboard.mockResolvedValue(true);
		const { wrapper } = await openDialog(DbConnectionIpAccessDialog, data(DBtype.Postgres, null));
		const snackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');

		const snippet = wrapper.find('[data-testid="ip-access-postgres"]');
		expect(snippet.text()).toContain('GRANT CONNECT ON DATABASE "shop" TO "admin";');
		expect(snippet.text()).toContain('host    all    all    18.221.81.73/32    trust');

		await snippet.find('button[aria-label="Copy the command."]').trigger('click');
		await flushPromises();

		expect(copyToClipboard).toHaveBeenCalledWith(expect.stringContaining('IN SCHEMA "public" GRANT SELECT'));
		expect(snackbar).toHaveBeenCalledWith('Command was copied to clipboard.');
		wrapper.unmount();
	});

	it('shows the MySQL grant for a self-hosted MySQL', async () => {
		const { wrapper } = await openDialog(DbConnectionIpAccessDialog, data(DBtype.MySQL, null));

		expect(wrapper.find('[data-testid="ip-access-mysql"]').text()).toContain(
			'GRANT ALL PRIVILEGES ON shop TO `admin`@`18.221.81.73`',
		);
		wrapper.unmount();
	});

	it('closes with "confirmed" once access is given, and with nothing on Cancel', async () => {
		const confirmed = await openDialog(DbConnectionIpAccessDialog, data(DBtype.MySQL, null));
		await buttonByText(confirmed.wrapper, "I've given access").trigger('click');
		await expect(confirmed.dialogRef.afterClosed()).resolves.toBe('confirmed');
		confirmed.wrapper.unmount();

		const cancelled = await openDialog(DbConnectionIpAccessDialog, data(DBtype.MySQL, null));
		await buttonByText(cancelled.wrapper, 'Cancel').trigger('click');
		await expect(cancelled.dialogRef.afterClosed()).resolves.toBeUndefined();
		cancelled.wrapper.unmount();
	});
});
