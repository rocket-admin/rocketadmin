import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Component } from 'vue';
import ActionLinkDialog from '@/components/dashboard/ActionLinkDialog.vue';
import BulkActionConfirmDialog from '@/components/dashboard/BulkActionConfirmationDialog.vue';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { type DialogRef, useDialog } from '@/composables/useDialog';
import ActionDeleteDialog from './ActionDeleteDialog.vue';
import WidgetDeleteDialog from './WidgetDeleteDialog.vue';

const tables = vi.hoisted(() => ({
	currentTableName: 'users',
	deleteRule: vi.fn(),
	activateActions: vi.fn(),
	bulkDelete: vi.fn(),
}));
const tableRow = vi.hoisted(() => ({ deleteTableRow: vi.fn() }));

vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/table-row', () => ({ useTableRowStore: () => tableRow }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => ({ currentConnectionID: '12345678' }) }));

let wrapper: VueWrapper;

async function openDialog<R>(dialog: Component, data?: unknown): Promise<DialogRef<R>> {
	setActivePinia(createPinia());
	wrapper = mount(DialogHost, { attachTo: document.body });
	const dialogRef = useDialog().open<R>(dialog, { data });
	await flushPromises();
	return dialogRef;
}

function button(label: string) {
	const match = wrapper.findAll('button').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`No button "${label}"`);
	return match;
}

const isOpen = () => wrapper.find('dialog').exists();

afterEach(() => wrapper.unmount());

beforeEach(() => {
	vi.clearAllMocks();
	tables.deleteRule.mockResolvedValue({ title: 'Ping' });
	tables.bulkDelete.mockResolvedValue({});
	tableRow.deleteTableRow.mockResolvedValue(undefined);
});

describe('ActionDeleteDialog', () => {
	it('deletes the automation and closes with true', async () => {
		const dialogRef = await openDialog<boolean>(ActionDeleteDialog, {
			connectionID: '12345678',
			tableName: 'users',
			rule: { id: 'r1', title: 'Ping' },
		});
		expect(wrapper.text()).toContain('You are going to delete Ping action.');

		await button('Delete').trigger('click');
		await flushPromises();

		expect(tables.deleteRule).toHaveBeenCalledWith('12345678', 'users', 'r1');
		await expect(dialogRef.afterClosed()).resolves.toBe(true);
	});

	it('stays open when the delete fails', async () => {
		tables.deleteRule.mockRejectedValue(new Error('no'));
		await openDialog(ActionDeleteDialog, { connectionID: 'c', tableName: 't', rule: { id: 'r1', title: 'Ping' } });
		await button('Delete').trigger('click');
		await flushPromises();
		expect(isOpen()).toBe(true);
	});
});

describe('WidgetDeleteDialog', () => {
	it('names the column and closes with "delete" when confirmed', async () => {
		const dialogRef = await openDialog<string>(WidgetDeleteDialog, 'email');
		expect(wrapper.text()).toContain('You are going to delete widget for email field.');
		await button('Delete').trigger('click');
		await expect(dialogRef.afterClosed()).resolves.toBe('delete');
	});

	it('asks about all widgets without a column, and Cancel closes without a result', async () => {
		const dialogRef = await openDialog<string>(WidgetDeleteDialog);
		expect(wrapper.text()).toContain('Do you want to delete all widgets?');
		await button('Cancel').trigger('click');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
	});
});

describe('BulkActionConfirmDialog', () => {
	it('lists the primary keys and deletes one row', async () => {
		const dialogRef = await openDialog<boolean>(BulkActionConfirmDialog, {
			title: 'Delete row',
			primaryKeys: [{ id: 42 }],
			tableDisplayName: 'Users',
		});
		expect(wrapper.find('h2').text()).toBe('Confirm delete row for Users table');
		expect(wrapper.text()).toContain('id = 42');

		await button('Delete row').trigger('click');
		await flushPromises();

		expect(tableRow.deleteTableRow).toHaveBeenCalledWith('12345678', 'users', { id: 42 });
		await expect(dialogRef.afterClosed()).resolves.toBe(true);
	});

	it('deletes several rows in bulk', async () => {
		await openDialog(BulkActionConfirmDialog, { title: 'delete rows', primaryKeys: [{ id: 1 }, { id: 2 }, { id: 3 }] });
		await button('delete rows').trigger('click');
		await flushPromises();
		expect(tables.bulkDelete).toHaveBeenCalledWith('12345678', 'users', [{ id: 1 }, { id: 2 }, { id: 3 }]);
	});

	it('runs a custom action and opens the link it answers with', async () => {
		tables.activateActions.mockResolvedValue({ location: 'https://go.test' });
		await openDialog(BulkActionConfirmDialog, { id: 'a1', title: 'Ping', primaryKeys: [{ id: 1 }] });
		await button('Ping').trigger('click');
		await flushPromises();

		expect(tables.activateActions).toHaveBeenCalledWith('12345678', 'users', 'a1', 'Ping', [{ id: 1 }]);
		const link = wrapper.find('a[href="https://go.test"]');
		expect(link.text()).toContain('Take action Ping for');
		expect(link.text()).toContain('id = 1');
	});
});

describe('ActionLinkDialog', () => {
	it('shows the identity value when given, and closes when the link is followed', async () => {
		const dialogRef = await openDialog(ActionLinkDialog, {
			href: 'https://go.test',
			actionName: 'Ping',
			identityFieldValue: 'Ann',
		});
		const link = wrapper.find('a');
		expect(link.attributes('target')).toBe('_blank');
		expect(link.text()).toContain('Take action Ping for Ann');
		await link.trigger('click');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		expect(isOpen()).toBe(false);
	});
});
